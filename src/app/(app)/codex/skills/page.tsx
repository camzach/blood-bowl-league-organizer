import { db } from "~/utils/drizzle";
import SkillsClientPage from "./skills-client-page";

export default async function SkillsPage() {
  const skills = await db.query.skill.findMany({
    orderBy: { category: "asc", name: "asc" },
  });

  return <SkillsClientPage skills={skills} />;
}
