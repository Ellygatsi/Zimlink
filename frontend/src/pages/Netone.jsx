import AirtimeProviderPage from "@/components/AirtimeProviderPage";
import netoneLogo from "@/Assets/netone.png";

export default function Netone() {
  return (
    <AirtimeProviderPage
      slug="netone"
      name="NetOne"
      initials="NO"
      initialsColor="text-blue-600"
      logo={netoneLogo}
    />
  );
}