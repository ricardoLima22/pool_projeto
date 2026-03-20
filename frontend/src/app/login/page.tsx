import PoolBackground from "../../components/PoolBackground";
import LoginCard from "../../components/LoginCard";

export default function Login() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <PoolBackground />
      <div className="relative z-10 w-full">
        <LoginCard />
      </div>
    </div>
  );
}
