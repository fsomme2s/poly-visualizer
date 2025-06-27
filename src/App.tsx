import './index.css';
import React, { useState, useRef } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

export default function App() {
  return <PolygonVisualizer />;
}

const PolygonVisualizer = () => {
  const [polygons, setPolygons] = useState<Array<Array<{x: number, z: number}>>>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [xCoordinate, setXCoordinate] = useState('');
  const [zCoordinate, setZCoordinate] = useState('');
  const [customPoint, setCustomPoint] = useState<{x: number, z: number} | null>(null);
  const [viewBox, setViewBox] = useState({
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  });
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [panOffset, setPanOffset] = useState({x: 0, y: 0});
  const svgRef = useRef<SVGSVGElement>(null);

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

  const calculateBounds = (polygons: Array<Array<{x: number, z: number}>>, customPoint: {x: number, z: number} | null = null) => {
    if (!polygons.length && !customPoint) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Include polygon points - now z maps directly to Y (no inversion)
    polygons.forEach((polygon) => {
      polygon.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.z); // Direct mapping: z -> Y
        maxY = Math.max(maxY, point.z);
      });
    });

    // Include custom point if it exists
    if (customPoint) {
      minX = Math.min(minX, customPoint.x);
      maxX = Math.max(maxX, customPoint.x);
      minY = Math.min(minY, customPoint.z); // Direct mapping: z -> Y
      maxY = Math.max(maxY, customPoint.z);
    }

    // Handle case where we only have a single point
    if (minX === maxX && minY === maxY) {
      minX -= 5;
      maxX += 5;
      minY -= 5;
      maxY += 5;
    }

    // Add padding
    const padding = Math.max(maxX - minX, maxY - minY) * 0.1;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    return { minX, minY, maxX, maxY };
  };

  const updateViewBox = (polygons: Array<Array<{x: number, z: number}>>, customPoint: {x: number, z: number} | null = null) => {
    const bounds = calculateBounds(polygons, customPoint);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    setViewBox({
      minX: bounds.minX,
      minY: bounds.minY,
      width: width,
      height: height,
    });
    // Reset pan offset when updating view box
    setPanOffset({x: 0, y: 0});
  };

  const parsePolygons = (text: string) => {
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
    } catch (err: any) {
      throw new Error(`Invalid JSON format: ${err.message}`);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    setError('');

    if (!text.trim()) {
      setPolygons([]);
      updateViewBox([], customPoint);
      return;
    }

    try {
      const parsed = parsePolygons(text);
      setPolygons(parsed);
      updateViewBox(parsed, customPoint);
    } catch (err: any) {
      setError(err.message);
      setPolygons([]);
    }
  };

  const handleCoordinateChange = (x: string, z: string) => {
    setXCoordinate(x);
    setZCoordinate(z);

    // Parse and validate coordinates
    const xNum = parseFloat(x);
    const zNum = parseFloat(z);

    if (x.trim() === '' || z.trim() === '' || isNaN(xNum) || isNaN(zNum)) {
      setCustomPoint(null);
      updateViewBox(polygons, null);
      return;
    }

    const newPoint = { x: xNum, z: zNum };
    setCustomPoint(newPoint);
    updateViewBox(polygons, newPoint);
  };

  const generatePolygonPoints = (polygon: Array<{x: number, z: number}>) => {
    return polygon.map((point) => `${point.x},${point.z}`).join(' '); // Direct mapping: z -> Y
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.1));
  };

  const handleReset = () => {
    setZoom(1);
    setPanOffset({x: 0, y: 0});
    updateViewBox(polygons, customPoint);
  };

  const loadSampleData = () => {
    setInputText(sampleData);
    handleInputChange(sampleData);
  };

  const getPolygonColor = (index: number) => {
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

  const handlePointHover = (event: React.MouseEvent, point: {x: number, z: number}, polygonIndex?: number) => {
    if (isDragging) return; // Don't show tooltip while dragging
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const content = polygonIndex !== undefined 
      ? `Polygon ${polygonIndex + 1}\nX: ${point.x.toFixed(3)}\nZ: ${point.z.toFixed(3)}`
      : `Custom Point\nX: ${point.x.toFixed(3)}\nZ: ${point.z.toFixed(3)}`;

    setTooltip({
      visible: true,
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content
    });
  };

  const handlePointLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Mouse drag handlers
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only handle left mouse button
    
    setIsDragging(true);
    setDragStart({
      x: event.clientX,
      y: event.clientY
    });
    setTooltip(prev => ({ ...prev, visible: false })); // Hide tooltip when starting drag
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragStart || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    
    // Convert pixel movement to SVG coordinate movement
    const scaleX = (viewBox.width / zoom) / rect.width;
    const scaleY = (viewBox.height / zoom) / rect.height;
    
    const newPanOffset = {
      x: panOffset.x - deltaX * scaleX,
      y: panOffset.y - deltaY * scaleY
    };
    
    setPanOffset(newPanOffset);
    setDragStart({
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Calculate the current viewBox with pan offset
  const currentViewBox = {
    minX: viewBox.minX + panOffset.x,
    minY: viewBox.minY + panOffset.y,
    width: viewBox.width / zoom,
    height: viewBox.height / zoom
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

          {/* Custom Point Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-red-600" />
              <h3 className="font-semibold text-gray-900">Custom Point</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="x-coordinate" className="block text-sm font-medium text-gray-700 mb-1">
                  X Coordinate
                </label>
                <input
                  id="x-coordinate"
                  type="number"
                  step="any"
                  value={xCoordinate}
                  onChange={(e) => handleCoordinateChange(e.target.value, zCoordinate)}
                  placeholder="Enter X value"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label htmlFor="z-coordinate" className="block text-sm font-medium text-gray-700 mb-1">
                  Z Coordinate
                </label>
                <input
                  id="z-coordinate"
                  type="number"
                  step="any"
                  value={zCoordinate}
                  onChange={(e) => handleCoordinateChange(xCoordinate, e.target.value)}
                  placeholder="Enter Z value"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            {customPoint && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  Custom point: ({customPoint.x}, {customPoint.z})
                </p>
              </div>
            )}
          </div>

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

          <div className="border border-gray-300 rounded-lg bg-white overflow-hidden relative">
            <svg
              ref={svgRef}
              width="100%"
              height="400"
              viewBox={`${currentViewBox.minX} ${currentViewBox.minY} ${currentViewBox.width} ${currentViewBox.height}`}
              className={`block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                background:
                  'linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
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
                      cy={point.z}
                      r="1.5"
                      fill={getPolygonColor(index)}
                      className="hover:r-3 transition-all cursor-pointer"
                      onMouseEnter={(e) => handlePointHover(e, point, index)}
                      onMouseLeave={handlePointLeave}
                    />
                  ))}
                </g>
              ))}

              {/* Custom Point */}
              {customPoint && (
                <g>
                  <circle
                    cx={customPoint.x}
                    cy={customPoint.z}
                    r="0.8"
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth="0.2"
                    className="hover:r-4 transition-all cursor-pointer"
                    onMouseEnter={(e) => handlePointHover(e, customPoint)}
                    onMouseLeave={handlePointLeave}
                  />
                  <circle
                    cx={customPoint.x}
                    cy={customPoint.z}
                    r="1.5"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="0.1"
                    strokeDasharray="0.3,0.3"
                    opacity="0.7"
                  />
                </g>
              )}
            </svg>

            {/* Tooltip */}
            {tooltip.visible && !isDragging && (
              <div
                className="absolute pointer-events-none z-10 bg-gray-900 text-white text-xs rounded-md px-2 py-1 shadow-lg whitespace-pre-line"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: 'translate(0, -100%)'
                }}
              >
                {tooltip.content}
              </div>
            )}
          </div>

          {polygons.length === 0 && !customPoint && (
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                No polygons or points to display. Add data to visualize.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {(polygons.length > 0 || customPoint) && (
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
            {customPoint && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span className="text-sm">
                  Custom Point ({customPoint.x}, {customPoint.z})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};