import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { SketchStore } from "../../stores/sketchstore";
import {Eye,EyeClosed,Trash,RefreshCcw} from  'lucide-react'
export const PropertiesPanel = observer(() => {
  const shape = SketchStore.selectedShape;

  // Local editable state
  const [localShape, setLocalShape] = useState(null);

  useEffect(() => {
    if (shape) {
      setLocalShape({ ...shape });
    } else {
      setLocalShape(null);
    }
  }, [shape]);

  if (!shape || !localShape) {
    return <div className="p-4 text-gray-500">Select a shape</div>;
  }

  const handleChange = (field, value) => {
    setLocalShape((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = () => {
    SketchStore.updateShape(shape.id, localShape);
  };

  return (
    <div className="p-4  w-72 bg-transparent flex flex-col gap-4">
      {/* Title */}
      <h3 className="font-semibold text-lg border-b pb-2">
        {localShape.displayName || `${localShape.type} ${localShape.id}`}
      </h3>

      {/* LINE */}
      {localShape.type === "line" && (
        <>
          <div>
            <h4 className="font-medium mb-2">Starting Point</h4>
            {["x1", "y1", "z1"].map((axis) => (
              <label key={axis} className="flex justify-between mb-1 text-sm">
                {axis}:
                <input
                  type="number"
                  value={localShape[axis]}
                  onChange={(e) =>
                    handleChange(axis, parseFloat(e.target.value))
                  }
                  className="border p-1 w-40"
                />
              </label>
            ))}
          </div>

          <div>
            <h4 className="font-medium mb-2">Ending Point</h4>
            {["x2", "y2", "z2"].map((axis) => (
              <label key={axis} className="flex justify-between mb-1 text-sm">
                {axis}:
                <input
                  type="number"
                  value={localShape[axis]}
                  onChange={(e) =>
                    handleChange(axis, parseFloat(e.target.value))
                  }
                  className="border p-1 w-40"
                />
              </label>
            ))}
          </div>
        </>
      )}

      {/* CIRCLE */}
      {localShape.type === "circle" && (
        <>
          <div>
            <h4 className="font-medium mb-2">Center Point</h4>
            {["cx", "cy", "cz"].map((axis) => (
              <label key={axis} className="flex justify-between mb-1 text-sm">
                {axis}:
                <input
                  type="number"
                  value={localShape[axis] || 0}
                  onChange={(e) =>
                    handleChange(axis, parseFloat(e.target.value))
                  }
                  className="border p-1 w-40"
                />
              </label>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-2">Radius</h4>
            <input
              type="number"
              value={localShape.r}
              onChange={(e) => handleChange("r", parseFloat(e.target.value))}
              className="border p-1 w-full"
            />
          </div>
        </>
      )}

      {/* ELLIPSE */}
      {localShape.type === "ellipse" && (
        <>
          <div>
            <h4 className="font-medium mb-2">Center Point</h4>
            {["cx", "cy"].map((axis) => (
              <label key={axis} className="flex justify-between mb-1 text-sm">
                {axis}:
                <input
                  type="number"
                  value={localShape[axis]}
                  onChange={(e) =>
                    handleChange(axis, parseFloat(e.target.value))
                  }
                  className="border p-1 w-40"
                />
              </label>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-2">Radius</h4>
            <label className="flex justify-between mb-1 text-sm">
              rx:
              <input
                type="number"
                value={localShape.rx}
                onChange={(e) =>
                  handleChange("rx", parseFloat(e.target.value))
                }
                className="border p-1 w-40"
              />
            </label>
            <label className="flex justify-between mb-1 text-sm">
              ry:
              <input
                type="number"
                value={localShape.ry}
                onChange={(e) =>
                  handleChange("ry", parseFloat(e.target.value))
                }
                className="border p-1 w-40"
              />
            </label>
          </div>
        </>
      )}

      {/* POLYLINE */}
      {localShape.type === "polyline" && (
        <div>
          <h4 className="font-medium mb-2">Points</h4>
          {localShape.points.map((pt, idx) => (
            <div key={idx} className="mb-2 p-2  rounded">
              <p className="text-sm font-medium mb-1">Point {idx + 1}</p>
              <div className="flex gap-2">
                x :
                <input
                  type="number"
                  value={pt.x}
                  onChange={(e) => {
                    const newPoints = [...localShape.points];
                    newPoints[idx].x = parseFloat(e.target.value);
                    handleChange("points", newPoints);
                  }}
                  className="border p-1 w-20"
                />
                y :
                <input
                  type="number"
                  value={pt.y}
                  onChange={(e) => {
                    const newPoints = [...localShape.points];
                    newPoints[idx].y = parseFloat(e.target.value);
                    handleChange("points", newPoints);
                  }}
                  className="border p-1 w-20"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Button */}
      <button
        className="border rounded py-2 flex items-center justify-center gap-2 hover:bg-gray-100"
        onClick={handleUpdate}
      >
        <RefreshCcw size={20}/> Update
      </button>

      {/* Color + Opacity */}
      <div>
        <h4 className="font-medium mb-2">Color</h4>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={localShape.color || "#ff0000"}
            onChange={(e) => handleChange("color", e.target.value)}
            className="w-12 h-8 border"
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localShape.opacity ?? 1}
            onChange={(e) =>
              handleChange("opacity", parseFloat(e.target.value))
            }
          />
          <span className="text-sm w-10">
            {Math.round((localShape.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Actions */}
      <button
        className="border rounded py-2 px-20 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => SketchStore.toggleVisibility(shape.id)}
      >
        {shape.hidden ? (
          <>   <Eye size={18} />
            
            Show
          </>
        ) : (
          <>
           <EyeClosed size={18} />
            Hide
          </>
        )}
      </button>
      <button
        className="border rounded py-2 px-20 hover:bg-red-50 flex items-center gap-2"
        onClick={() => SketchStore.deleteShape(shape.id)}
      >
        <Trash size={18} />
        Delete
      </button>
    </div>
  );
});
