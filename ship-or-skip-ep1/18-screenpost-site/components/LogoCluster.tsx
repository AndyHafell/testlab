import { Apple, Sparkles, Code2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { XIcon, GithubIcon } from "@/components/icons";

const INTEGRATIONS: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "X", Icon: XIcon },
  { label: "macOS", Icon: Apple },
  { label: "Claude", Icon: Sparkles },
  { label: "GitHub", Icon: GithubIcon },
  { label: "VS Code", Icon: Code2 },
];

export default function LogoCluster() {
  return (
    <section className="reveal mx-auto max-w-6xl px-5 py-12">
      <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Plugged into your workflow
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {INTEGRATIONS.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2 text-zinc-500 grayscale transition hover:text-zinc-200"
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
