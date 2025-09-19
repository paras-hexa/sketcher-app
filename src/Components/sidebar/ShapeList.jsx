// src/Components/sidebar/ShapeList.jsx
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
   Trash ,
   ChevronDown,
   ChevronRight,
   ChevronLeft,
   Delete
} from "lucide-react"; // Shape type → icon map
import { Line } from "three";




export const ShapeList = observer(() => {
  const [collapsed, setCollapsed] = useState(false);

  //icon
  const shapeIcons = {
  line:<PenLine size={20}></PenLine>,
  circle: <Circle size={20}></Circle>,
  ellipse: <CircleDashed size={20}></CircleDashed>,
  polyline: <Route size={20}></Route>,
};
  // Filter by search
  const filteredShapes = SketchStore.shapes.filter((shape) =>
    shape.type.toLowerCase().includes(uiStore.searchQuery.toLowerCase())
  );

  const handleHide = (id) => {
    SketchStore.toggleVisibility(id);
  };

  return (
    <div className="shape-list p-2 bg-gray-100 h-full flex flex-col">
      {/* 🔍 Search bar */}
      <input
        type="text"
        placeholder="Search..."
        className="mb-2 p-1 border rounded"
        value={uiStore.getSearchquery}
        onChange={(e) => uiStore.setSearchquery(e.target.value)}
      />

     
     
      <div className="folder">
        <div
          className="folder-header flex justify-between items-center cursor-pointer font-semibold"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span>{collapsed ? <ChevronRight size={20}/> : <ChevronDown size={20}/>} My file 1</span>
        </div>

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
                {/* Icon + Name */}
                
                <div className="flex items-center gap-2">
                  <span>{ shapeIcons[shape.type] }</span>
                  <span>
                    {shape.type} {shape.id}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHide(shape.id);
                    }}
                  >
                    {shape.hidden ? <Eye size={20}/>: <EyeClosed size={20}/>}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      SketchStore.deleteShape(shape.id);
                    }}
                  >
                    <Trash size={20}/>
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
