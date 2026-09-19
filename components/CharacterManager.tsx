"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Character = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  default_prompt: string | null;
  created_at: string;
};

type CharacterReference = {
  id: string;
  character_id: string;
  storage_path: string;
  label: string | null;
  mime_type: string | null;
  created_at: string;
  signed_url?: string;
};

export function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [references, setReferences] = useState<CharacterReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [charactersResult, referencesResult] = await Promise.all([
      supabase
        .from("characters")
        .select("id,name,description,notes,default_prompt,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("character_references")
        .select("id,character_id,storage_path,label,mime_type,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (charactersResult.error) {
      setMessage(charactersResult.error.message);
      setLoading(false);
      return;
    }

    if (referencesResult.error) {
      setMessage(referencesResult.error.message);
      setLoading(false);
      return;
    }

    const refs = (referencesResult.data ?? []) as CharacterReference[];

    const signedRefs = await Promise.all(
      refs.map(async (reference) => {
        const { data } = await supabase.storage
          .from("character-references")
          .createSignedUrl(reference.storage_path, 60 * 60);

        return {
          ...reference,
          signed_url: data?.signedUrl,
        };
      }),
    );

    setCharacters((charactersResult.data ?? []) as Character[]);
    setReferences(signedRefs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/40">
          {loading
            ? "Loading your characters..."
            : `${characters.length} saved ${characters.length === 1 ? "character" : "characters"}`}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-violet-100"
        >
          {showCreate ? "Close" : "＋ New character"}
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] px-4 py-3 text-sm text-white/60">
          {message}
        </div>
      )}

      {showCreate && (
        <CreateCharacterForm
          onCreated={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-white/10 bg-white/[0.02] text-sm text-white/35">
          Opening your character library...
        </div>
      ) : characters.length === 0 ? (
        <EmptyCharacters onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              references={references.filter((reference) => reference.character_id === character.id)}
              onUploaded={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyCharacters({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="min-h-72 w-full rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-left transition hover:border-violet-300/30 hover:bg-white/[0.04]"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl">
        ＋
      </div>
      <div className="mt-20 text-xl font-medium">Create your first character</div>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
        Save an identity once, upload reference images, and reuse that character across future Kinora creations.
      </p>
    </button>
  );
}

function CreateCharacterForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("characters").insert({
      name: name.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      default_prompt: defaultPrompt.trim() || null,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-3xl border border-violet-300/15 bg-violet-400/[0.045] p-5 sm:p-6"
    >
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.2em] text-violet-200/55">NEW CHARACTER</div>
        <h2 className="mt-2 text-2xl font-medium">Build a reusable identity.</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CharacterField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Bijou Nicole"
          required
        />
        <CharacterField
          label="Short description"
          value={description}
          onChange={setDescription}
          placeholder="Black R&B/pop artist, glamorous..."
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CharacterArea
          label="Identity notes"
          value={notes}
          onChange={setNotes}
          placeholder="Hair, features, styling rules, visual details to preserve..."
        />
        <CharacterArea
          label="Default prompt"
          value={defaultPrompt}
          onChange={setDefaultPrompt}
          placeholder="Optional prompt language Kinora can reuse later..."
        />
      </div>

      {message && <p className="mt-4 text-sm text-red-200/70">{message}</p>}

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Saving..." : "Save character"}
      </button>
    </form>
  );
}

function CharacterCard({
  character,
  references,
  onUploaded,
}: {
  character: Character;
  references: CharacterReference[];
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadReference(file: File) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setUploading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You need to sign in again.");
        return;
      }

      const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `${user.id}/${character.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("character-references")
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: recordError } = await supabase.from("character_references").insert({
        character_id: character.id,
        storage_path: path,
        label: file.name,
        mime_type: file.type || null,
      });

      if (recordError) throw recordError;

      setMessage("Reference added.");
      onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="grid min-h-64 grid-cols-2 gap-px bg-white/10">
        {references.length > 0 ? (
          references.slice(0, 4).map((reference, index) => (
            <div
              key={reference.id}
              className={`relative overflow-hidden bg-[#0c0e12] ${
                references.length === 1 ? "col-span-2" : ""
              } ${index === 0 && references.length === 3 ? "row-span-2" : ""}`}
            >
              {reference.signed_url ? (
                <img
                  src={reference.signed_url}
                  alt={reference.label ?? character.name}
                  className="h-full min-h-32 w-full object-cover"
                />
              ) : (
                <div className="grid h-full min-h-32 place-items-center text-xs text-white/25">reference</div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-2 grid min-h-64 place-items-center bg-[#0c0e12]">
            <div className="text-center">
              <div className="text-3xl text-white/20">◉</div>
              <div className="mt-3 text-xs text-white/30">No references yet</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-violet-200/45">
          {references.length} {references.length === 1 ? "reference" : "references"}
        </div>
        <h2 className="mt-2 text-xl font-medium">{character.name}</h2>
        <p className="mt-2 min-h-10 text-sm leading-5 text-white/40">
          {character.description || "No description yet."}
        </p>

        <label className="mt-5 block">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadReference(file);
              event.currentTarget.value = "";
            }}
          />
          <span className="block cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-white/60 transition hover:border-violet-300/25 hover:text-white">
            {uploading ? "Uploading..." : "＋ Add reference image"}
          </span>
        </label>

        {message && <p className="mt-3 text-xs leading-5 text-white/40">{message}</p>}
      </div>
    </article>
  );
}

function CharacterField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/35"
      />
    </label>
  );
}

function CharacterArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/35">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/35"
      />
    </label>
  );
}
