import PoolBackground from "../../components/PoolBackground";
import LoginCard from "../../components/LoginCard";

export default function Login() {
  return (
    <div className="relative h-[100dvh] w-full flex flex-col justify-center overflow-hidden">
      <PoolBackground />
      <div className="relative z-10 w-full">
        <LoginCard />
      </div>
    </div>
  );
}
