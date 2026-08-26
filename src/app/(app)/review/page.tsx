import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Eyebrow } from "@/components/ui";
import { ReviewList } from "@/components/ReviewList";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Анонимная рецензия</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Рецензирование</h1>
        <p className="mt-1 text-[15px] text-muted">
          Выберите карту по теме, в которой разбираетесь. Список обновляется автоматически.
        </p>
      </div>

      <ReviewList />
    </div>
  );
}
