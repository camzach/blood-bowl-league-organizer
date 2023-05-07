import Link from "next/link";
import type { ComponentProps } from "react";

const StyledLink = (props: ComponentProps<typeof Link>) => (
  <Link
    {...props}
    className={`text-blue-500 visited:text-purple-900 hover:text-blue-800 ${props.className}`}
  >
    {props.children}
  </Link>
);

export default StyledLink;
