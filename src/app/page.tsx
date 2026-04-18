import { UploadAnalyzer } from "@/components/upload-analyzer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-950 border border-teal-500/30 rounded-full px-4 py-1.5 text-teal-400 text-sm mb-6">
            🩺 Türkiye&apos;nin ilk AI glukoz takip uygulaması
          </div>
          <h1 className="text-4xl font-bold mb-3 text-white">
            GlucoLens
          </h1>
          <p className="text-gray-400 text-lg">
            Yemek fotoğrafını yükle — şeker ve glisemik yükü anında gör
          </p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <UploadAnalyzer />
      </div>
    </main>
  );
}
