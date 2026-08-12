import AirtimeProviderPage from "@/components/AirtimeProviderPage";
import econetLogo from "@/Assets/econet.png";

export default function Econet() {
  return (
    <AirtimeProviderPage
      slug="econet"
      name="Econet"
      initials="EC"
      initialsColor="text-red-600"
      logo={econetLogo}
    />
  );
}