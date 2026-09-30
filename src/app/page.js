import FaceMesh from "@/components/FaceMesh";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wide text-yellow-400">
          FACE CONTOUR AI
        </h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">
          Scan your face. Discover your shape. Get your contour map.
        </p>
      </div>
      <FaceMesh />
    </main>
  );
}