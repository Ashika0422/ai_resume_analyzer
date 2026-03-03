import type { Route } from "./+types/home";
import Navbar from "~/Components/Navbar";
import ResumeCard from "~/Components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { use, useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { auth, kv} = usePuterStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

useEffect(() => {
  if (!auth.isAuthenticated) 
    navigate('/auth?next=/');
}, [auth.isAuthenticated, navigate]);

useEffect(() => {
  const loadResumes = async () => {
    setLoadingResumes(true);

    const resumes = (await kv.list('resume:*', true)) as KVItem[];

    const parsedResumes = resumes ?.map((resume) => (
      JSON.parse(resume.value) as Resume
    ))

    console.log("parsedResumes", parsedResumes);

    setResumes(parsedResumes || []);
    setLoadingResumes(false);
  }

  loadResumes();

},[])


  return <main className="bg-[url('/images/bg-main.svg')]">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>

        {!loadingResumes && resumes.length === 0  ? (
          <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ):(
           <h2>Get instant feedback on your resume and job applications.</h2>
        )}
      </div>

        {loadingResumes && (
          <div className="flex flex-col items=center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
          
        )}
       {!loadingResumes && resumes.length > 0 && (
        <div className="resume-section grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-[1400px] place-items-center">
            {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
    )} 

    {!loadingResumes && resumes ?.length === 0 && (
      <div className="flex flex-col items-center justify-center mt-10 gap-4">
        <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
          Upload Resume
        </Link>
      </div>
    )}
    </section>
      
  </main>
}
