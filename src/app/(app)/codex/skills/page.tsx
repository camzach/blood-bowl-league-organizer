import { db } from "~/utils/drizzle";
import SkillsClientPage from "./skills-client-page";

export default async function SkillsPage() {
  const skills = await db.query.skill.findMany();

  return <SkillsClientPage skills={skills} />;
}
