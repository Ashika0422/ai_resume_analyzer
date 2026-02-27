import type { Route } from "./+types/home";
import Navbar from "~/Components/Navbar";
import { resumes } from "../../constants";
import ResumeCard from "~/Components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { auth} = usePuterStore();

useEffect(() => {
  if (!auth.isAuthenticated) 
    navigate('/auth?next=/');
}, [auth.isAuthenticated, navigate]);


  return <main className="bg-[url('/images/bg-main.svg')]">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        <h2>Get instant feedback on your resume and job applications</h2>
      </div>
       {resumes.length > 0 && (
     <div className="resume-section grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-[1400px] place-items-center">
        {resumes.map((resume) => (
         <ResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
    )} 
    </section>
      
  </main>
}
