import { db } from "~/utils/drizzle";
import SkillsClientPage from "./skills-client-page";
import { skill } from "~/db/schema";

export default async function SkillsPage() {
  const skills = await db.query.skill.findMany({
    orderBy: [skill.category, skill.name],
  });

  return <SkillsClientPage skills={skills} />;
}
