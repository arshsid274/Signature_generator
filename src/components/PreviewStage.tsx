"use client";

import { useState } from "react";
import { useProject } from "@/lib/store";
import SignatureCard from "./SignatureCard";
import { Button } from "@/components/ui";

export default function PreviewStage({ onExport }: { onExport: () => void }) {
  const { project } = useProject();
  const c = project.content;
  const a = project.animationOpts;
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 overflow-auto">
      <div className="w-full flex items-center justify-center overflow-auto">
        <SignatureCard
          name={c.name}
          title={c.title}
          company={c.company}
          email={c.email}
          website={c.website}
          phone={c.phone}
          photoSrc={c.photoSrc}
          logoSrc={c.logoSrc}
          accent={c.accent}
          verified={c.verified}
          socials={c.socials}
          strips={a.strips}
          skew={a.skew}
          stagger={a.stagger}
          durationMs={a.durationMs}
          replayKey={replayKey}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => setReplayKey((k) => k + 1)}>▶ Replay</Button>
        <Button variant="primary" onClick={onExport}>
          Export GIF
        </Button>
      </div>
      <p className="text-[11px] text-[var(--muted)] max-w-md text-center">
        Live preview of the animated signature. Email clients only animate GIFs —
        use the <strong>Email</strong> tab to turn just the photo into a GIF and
        copy the whole signature for Gmail / Outlook.
      </p>
    </div>
  );
}
