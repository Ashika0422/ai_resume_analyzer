import type { Route } from "./+types/home";
import Navbar from "~/Components/Navbar";
import ResumeCard from "~/Components/ResumeCard";
import Chatbot from "~/Components/Chatbot/Chatbot";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ATSify" },
    
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { auth, kv} = usePuterStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

const handleClearAllResumes = async () => {
  if (!confirm("Are you sure you want to delete all resumes? This cannot be undone.")) {
    return;
  }
  
  setIsDeleting(true);
  try {
    console.log("Clearing all resumes...");
    
    // Use flush to clear all KV storage (this is the only reliable method in Puter.js)
    const result = await kv.flush();
    console.log("Flush result:", result);
    
    setResumes([]);
    alert("All resumes have been deleted successfully!");
  } catch (error) {
    console.error("Error deleting resumes:", error);
    alert("Failed to delete resumes. Error: " + (error instanceof Error ? error.message : String(error)));
  } finally {
    setIsDeleting(false);
  }
}


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
        <>
          <div className="flex justify-end w-full max-w-[1400px] mb-4">
            <button 
              onClick={handleClearAllResumes}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg font-semibold transition"
            >
              {isDeleting ? "Deleting..." : "Clear All Resumes"}
            </button>
          </div>
          <div className="resume-section grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-[1400px] place-items-center">
              {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
              ))}
            </div>
        </>
    )} 

    {!loadingResumes && resumes ?.length === 0 && (
      <div className="flex flex-col items-center justify-center mt-10 gap-4">
        <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
          Upload Resume
        </Link>
      </div>
    )}
    </section>
    <Chatbot />
  </main>
}
