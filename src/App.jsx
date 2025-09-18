import {SketchCanvas} from "./Components/canvas/Sketchcanvas"
import { ShapeList } from "./Components/sidebar/ShapeList"
import { Toolbar } from "./Components/toolbar/Toolbar"
import { PropertiesPanel } from "./Components/propertiess/PropertiesPanel"

function App() {
 
  return (
      <div className="w-screen h-screen flex flex-col bg-white ">
  
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden m-2">
        {/* Left Panel */}
        <div className="w-1/5 bg-gray-300 rounded-md p-2 m-2">
          <ShapeList />
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center">
          <Toolbar />
          <SketchCanvas />
        </div>

        {/* Right Panel */}
        <div className="w-1/5  bg-gray-300 rounded-md p-2 m-2">
          <PropertiesPanel />
        </div>
      </div>
    </div>

  )
}

export default App
