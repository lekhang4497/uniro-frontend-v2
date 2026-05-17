"use client";

import { Code2 } from "lucide-react";
import { UniroMark } from "@/shared/components/UniroMark";

export default function Footer() {
  return (
    <footer className="border-t border-[#2a2926] bg-[#120f0d] pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <UniroMark size={28} className="text-[#d97757]" />
              <h3 className="text-white text-lg font-bold">Uniro</h3>
            </div>
            <p className="text-gray-500 text-sm max-w-xs mb-6">
              The unified endpoint for AI generation. Connect, route, and manage
              your AI providers with ease.
            </p>
            <div className="flex gap-4">
              <a
                className="text-gray-400 hover:text-white transition-colors"
                href="https://github.com/your-org/uniro"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Code2 className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-white">Product</h4>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="/dashboard"
            >
              Dashboard
            </a>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="https://github.com/your-org/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              Changelog
            </a>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-white">Resources</h4>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="https://github.com/your-org/uniro#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="https://github.com/your-org/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="https://www.npmjs.com/package/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM
            </a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-white">Legal</h4>
            <a
              className="text-gray-400 hover:text-[#d97757] text-sm transition-colors"
              href="https://github.com/your-org/uniro/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT License
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#2a2926] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            &copy; 2025 Uniro. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              className="text-gray-600 hover:text-white text-sm transition-colors"
              href="https://github.com/your-org/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              className="text-gray-600 hover:text-white text-sm transition-colors"
              href="https://www.npmjs.com/package/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
