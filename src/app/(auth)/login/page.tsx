import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  // نتحقق أن next مسار نسبي لمنع open redirect
  const safeNext = next?.startsWith("/") ? next : undefined;
  return <LoginForm next={safeNext} />;
}
