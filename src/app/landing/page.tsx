"use client";

import { useRouter } from "next/navigation";
import Navigation from "./components/Navigation";
import HeroSection from "./components/HeroSection";
import FlowAnimation from "./components/FlowAnimation";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import GetStarted from "./components/GetStarted";
import Footer from "./components/Footer";

// Marketing landing page. Uses a deliberately divergent dark-themed brand
// palette (#141413 / #d97757) rather than the dashboard token system —
// these are the brand marketing colors and stay hard-coded.
export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="relative font-sans text-white overflow-x-hidden antialiased selection:bg-[#d97757] selection:text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#141413]">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(to right, #d97757 1px, transparent 1px), linear-gradient(to bottom, #d97757 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-[#d97757]/12 rounded-full blur-[130px] animate-blob" />
        <div
          className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[130px] animate-blob"
          style={{ animationDelay: "2s", animationDuration: "22s" }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-[650px] h-[650px] bg-blue-500/8 rounded-full blur-[130px] animate-blob"
          style={{ animationDelay: "4s", animationDuration: "25s" }}
        />

        {/* Vignette effect */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, transparent 0%, rgba(24, 20, 17, 0.4) 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navigation />

        <main>
          {/* Hero with Flow Animation */}
          <div className="relative">
            <HeroSection />
            <div className="flex justify-center pb-20">
              <FlowAnimation />
            </div>
          </div>

          <GetStarted />
          <HowItWorks />
          <Features />

          {/* CTA Section */}
          <section className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-t from-[#d97757]/5 to-transparent pointer-events-none" />
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <h2 className="mb-6 text-4xl md:text-5xl font-black">
                Ready to Simplify Your AI Infrastructure?
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-400">
                Join developers who are streamlining their AI integrations with
                Uniro. Open source and free to start.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="h-14 w-full sm:w-auto px-10 rounded-lg bg-[#d97757] text-[#141413] text-lg font-bold transition-all hover:bg-[#e0650a] shadow-[0_0_20px_rgba(217,119,87,0.5)]"
                >
                  Start Free
                </button>
                <button
                  onClick={() =>
                    window.open("https://github.com/your-org/uniro#readme", "_blank")
                  }
                  className="h-14 w-full sm:w-auto px-10 rounded-lg border border-[#2a2926] text-white text-lg font-bold transition-all hover:bg-[#1f1e1c]"
                >
                  Read Documentation
                </button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

      {/* Global styles for keyframes */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
