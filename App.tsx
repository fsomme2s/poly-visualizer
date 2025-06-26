import './style.css';
import React, { useState, useRef, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function App() {
  return <PolygonVisualizer />;
}

const PolygonVisualizer = () => {
  const [polygons, setPolygons] = useState([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [viewBox, setViewBox] = useState({
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);

  // Sample data for demonstration
  const sampleData = `[
  [
    {
      "x": 64.02012867449838,
      "z": -83.39716684378219
    },
    {
      "x": 64.61505866154819,
      "z": -80.83689842599303
    },
    {
      "x": 63.421743901647226,
      "z": -85.19053843190402
    }
  ],
  [
    {
      "x": 70.5,
      "z": -75.2
    },
    {
      "x": 72.1,
      "z": -73.8
    },
    {
      "x": 71.3,
      "z": -77.1
    },
    {
      "x": 69.8,
      "z": -76.5
    }
  ]
]`;

  const calculateBounds = (polygons) => {
    if (!polygons.length) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    polygons.forEach((polygon) => {
      polygon.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, -point.z); // Flip Z to Y for display
        maxY = Math.max(maxY, -point.z);
      });
    });

    // Add padding
    const padding = Math.max(maxX - minX, maxY - minY) * 0.1;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    return { minX, minY, maxX, maxY };
  };

  const updateViewBox = (polygons) => {
    const bounds = calculateBounds(polygons);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    setViewBox({
      minX: bounds.minX,
      minY: bounds.minY,
      width: width,
      height: height,
    });
  };

  const parsePolygons = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be an array');
      }

      // Validate structure
      parsed.forEach((polygon, i) => {
        if (!Array.isArray(polygon)) {
          throw new Error(`Polygon ${i} must be an array`);
        }
        polygon.forEach((point, j) => {
          if (!point.hasOwnProperty('x') || !point.hasOwnProperty('z')) {
            throw new Error(
              `Point ${j} in polygon ${i} must have x and z properties`
            );
          }
          if (typeof point.x !== 'number' || typeof point.z !== 'number') {
            throw new Error(
              `Point ${j} in polygon ${i} must have numeric x and z values`
            );
          }
        });
      });

      return parsed;
    } catch (err) {
      throw new Error(`Invalid JSON format: ${err.message}`);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    setError('');

    if (!text.trim()) {
      setPolygons([]);
      return;
    }

    try {
      const parsed = parsePolygons(text);
      setPolygons(parsed);
      updateViewBox(parsed);
    } catch (err) {
      setError(err.message);
      setPolygons([]);
    }
  };

  const generatePolygonPath = (polygon) => {
    if (polygon.length < 3) return '';

    let path = `M ${polygon[0].x} ${-polygon[0].z}`;
    for (let i = 1; i < polygon.length; i++) {
      path += ` L ${polygon[i].x} ${-polygon[i].z}`;
    }
    path += ' Z';
    return path;
  };

  const generatePolygonPoints = (polygon) => {
    return polygon.map((point) => `${point.x},${-point.z}`).join(' ');
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.1));
  };

  const handleReset = () => {
    setZoom(1);
    if (polygons.length > 0) {
      updateViewBox(polygons);
    }
  };

  const loadSampleData = () => {
    setInputText(sampleData);
    handleInputChange(sampleData);
  };

  const getPolygonColor = (index) => {
    const colors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Polygon Visualizer
        </h1>
        <p className="text-gray-600">
          Visualize polygons from x+z coordinate arrays
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Input Data</h2>
            <button
              onClick={loadSampleData}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
            >
              <Upload size={16} />
              Load Sample
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste your polygon data here..."
            className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {polygons.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                Successfully loaded {polygons.length} polygon
                {polygons.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Visualization Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Visualization</h2>
            <div className="flex gap-2">
              <button
                onClick={handleZoomIn}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="400"
              viewBox={`${viewBox.minX} ${viewBox.minY} ${
                viewBox.width / zoom
              } ${viewBox.height / zoom}`}
              className="block"
              style={{
                background:
                  'linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            >
              {/* Grid lines */}
              <defs>
                <pattern
                  id="grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Polygons */}
              {polygons.map((polygon, index) => (
                <g key={index}>
                  <polygon
                    points={generatePolygonPoints(polygon)}
                    fill={getPolygonColor(index)}
                    fillOpacity="0.3"
                    stroke={getPolygonColor(index)}
                    strokeWidth="0.1"
                    className="hover:fill-opacity-50 transition-all cursor-pointer"
                  />
                  {/* Vertices */}
                  {polygon.map((point, pointIndex) => (
                    <circle
                      key={pointIndex}
                      cx={point.x}
                      cy={-point.z}
                      r="0.3"
                      fill={getPolygonColor(index)}
                      className="hover:r-3 transition-all"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>

          {polygons.length === 0 && (
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                No polygons to display. Add data to visualize.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {polygons.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            {polygons.map((polygon, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getPolygonColor(index) }}
                ></div>
                <span className="text-sm">
                  Polygon {index + 1} ({polygon.length} vertices)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
