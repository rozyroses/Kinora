import { StudioHeader } from "@/components/StudioHeader";
import { CharacterManager } from "@/components/CharacterManager";

export default function CharactersPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <StudioHeader
        eyebrow="CHARACTERS"
        title="Keep your people consistent."
        description="Save an identity, attach private reference images, and build a reusable character library for future Kinora generations."
      />

      <CharacterManager />
    </div>
  );
}
