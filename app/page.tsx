import Image from "next/image";
import { Zap, Linkedin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col">
      <div className="w-full h-[100vh] relative">
        <Image
          src="/images/landingPage.jpg"
          alt="ProfEval"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="relative flex flex-col justify-center items-center sm:mt-20 mt-10 gap-5">
          <h1 className="sm:text-5xl text-2xl text-primary font-bold">
            ProfEval
          </h1>
          <h2 className="text-lg sm:text-2xl text-secondary text-center mt-5">
            Professor Recommendations, Reviews and Suggestions at the tip of
            your fingertips
          </h2>
          <div className="flex gap-5">
            <Zap className="text-secondary w-8 h-8" />
            <h3 className="text-secondary">Powered by OpenAI</h3>
            <Zap className="text-secondary w-8 h-8" />
          </div>
          <Button size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-10 p-5 my-5">
        <h1 className="text-2xl sm:text-4xl text-secondary">Developers</h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
          <div className="flex flex-col items-center justify-center">
            <div className="relative sm:w-40 sm:h-40 w-24 h-24 rounded-full overflow-hidden">
              <Image
                src="/images/maisha.jpg"
                alt="Maisha Supritee Chowdhury"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <h1 className="text-lg sm:text-2xl mt-4 text-center">
              Maisha Supritee Chowdhury
            </h1>
            <Link href="https://www.linkedin.com/in/maisha-supritee-chowdhury/">
              <div className="items-center mt-4 bg-linkedin p-2 rounded-lg">
                <Linkedin className="text-background" />
              </div>
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="relative sm:w-40 sm:h-40 w-24 h-24 rounded-full overflow-hidden">
              <Image
                src="/images/evan.jpg"
                alt="Evan Shoemaker"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <h1 className="mt-4 text-lg sm:text-2xl text-center">
              Evan Shoemaker
            </h1>
            <Link href="https://www.linkedin.com/in/evan-shoemaker/">
              <div className="items-center mt-4 bg-linkedin p-2 rounded-lg">
                <Linkedin className="text-background" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
