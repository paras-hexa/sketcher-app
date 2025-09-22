import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { SketchStore } from "../../stores/sketchstore";
import { uiStore } from "../../stores/uistore";
import {
  PenLine,
  Circle,
  CircleDashed,
  Route,
  Eye,
  EyeClosed,
  Trash,
  ChevronDown,
  ChevronRight,
  Search
} from "lucide-react";

export const ShapeList = observer(() => {
  const [collapsed, setCollapsed] = useState(false);

  // Icons for each shape type
  const shapeIcons = {
    line: <PenLine size={18} />,
    circle: <Circle size={18} />,
    ellipse: <CircleDashed size={18} />,
    polyline: <Route size={18} />,
  };
  
  console.log("shape store : " , SketchStore.shapes);
  
  // Count shapes per type to generate Line 1, Line 2 etc.
  const typeCounters = {};
  const namedShapes = SketchStore.shapes.map((shape) => {
    if (!typeCounters[shape.type]) typeCounters[shape.type] = 1;
    else typeCounters[shape.type] += 1;
    return {
      ...shape,
      displayName:
        shape.type.charAt(0).toUpperCase() +
        shape.type.slice(1) +
        " " +
        typeCounters[shape.type],
    };
  });

  // Filter with search
  const filteredShapes = namedShapes.filter((shape) =>
    shape.displayName.toLowerCase().includes(uiStore.searchQuery.toLowerCase())
  );

  const handleHide = (id) => {
    SketchStore.toggleVisibility(id);
  };

  return (
    <div className="shape-list p-2 bg-transparent h-full flex flex-col">
    
      <div className="relative mb-2">
        <Search size={16} className="absolute left-2 top-2 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          className="pl-7 pr-2 py-1 w-full border rounded text-sm"
          value={uiStore.getSearchquery}
          onChange={(e) => uiStore.setSearchquery(e.target.value)}
        />
      </div>

      {/* Folder header */}
      <div className="folder">
        <div
          className="folder-header flex items-center gap-1 cursor-pointer font-semibold"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          <span>My file 1</span>
        </div>

        {/* Shapes */}
        {!collapsed && (
          <div className="ml-4 mt-2">
            {filteredShapes.length === 0 && (
              <div className="text-sm text-gray-400">No shapes found</div>
            )}
            {filteredShapes.map((shape) => (
              <div
                key={shape.id}
                className={`shape-item flex items-center justify-between p-1 rounded cursor-pointer ${
                  SketchStore.selectedShapeId === shape.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => SketchStore.selectShape(shape.id)}
              >
                {/* Icon + Display Name */}
                <div className="flex items-center gap-2">
                  <span>{shapeIcons[shape.type]}</span>
                  <span>{shape.displayName}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHide(shape.id);
                    }}
                  >
                    {shape.hidden ? <Eye size={18} /> : <EyeClosed size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      SketchStore.deleteShape(shape.id);
                    }}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
