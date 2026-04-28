import { SignupForm } from "./signup-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : undefined;
  return <SignupForm next={safeNext} />;
}
