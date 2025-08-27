"use client";

import { useMemo, useState } from "react";
import Table from "~/components/table";
import { type skill } from "~/db/schema";
import { SearchFilter } from "../search-filter";

type Skill = typeof skill.$inferSelect;

export default function SkillsClientPage({ skills }: { skills: Skill[] }) {
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category));
    return ["all", ...Array.from(set)];
  }, [skills]);

  const filteredSkills = useMemo(() => {
    let filtered = skills.filter((skill) =>
      skill.name.toLowerCase().includes(skillName.toLowerCase()),
    );

    if (category !== "all") {
      filtered = filtered.filter((s) => s.category === category);
    }

    return filtered;
  }, [skills, skillName, category]);

  return (
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <details className="collapse-arrow bg-base-200 collapse">
          <summary className="collapse-title text-xl font-medium">
            Filters
          </summary>
          <div className="collapse-content">
            <div className="flex flex-col gap-4">
              <SearchFilter
                placeholder="Search skills..."
                onSearch={setSkillName}
              />
              <select
                className="select select-bordered w-full max-w-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase().concat(c.slice(1))}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </details>
      </div>
      <div className="basis-full">
        <h1 className="text-2xl">Skills</h1>
        <Table
          rows={filteredSkills.map((s) => ({ ...s, id: s.name }))}
          columns={[
            {
              id: "name",
              name: "Name",
              Component: ({ name }) => name,
            },
            {
              id: "category",
              name: "Category",
              Component: ({ category }) =>
                category.charAt(0).toUpperCase().concat(category.slice(1)),
            },
            {
              id: "rules",
              name: "Rules",
              Component: ({ rules }) => rules,
            },
          ]}
        />
      </div>
    </div>
  );
}

