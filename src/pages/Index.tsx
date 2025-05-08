
import { GridSketch } from "@/components/GridSketch";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold">Grid Sketch Architect</h1>
        <p className="text-sm text-gray-500">
          Dessinez des plans techniques précis en utilisant une grille de points
        </p>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <GridSketch />
      </main>
    </div>
  );
};

export default Index;
