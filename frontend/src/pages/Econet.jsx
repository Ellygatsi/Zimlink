import AirtimeProviderPage from "@/components/AirtimeProviderPage";

export default function Econet() {
  return (
    <AirtimeProviderPage
      slug="econet"
      name="Econet"
      color="bg-red-50 dark:bg-red-950/30"
      initials="EC"
      initialsColor="text-red-600"
      logo="/logos/econet.png"
    />
  );
}