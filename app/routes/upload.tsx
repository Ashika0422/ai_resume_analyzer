import React, { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router';
import FileUploader from '~/Components/FileUploader';
import Navbar from '~/Components/Navbar'
import { usePuterStore } from '~/lib/puter';

const Uploads = () => {
  const {auth, isLoading, fs, ai, kv} = usePuterStore();
  const navigae = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  }

  const handleAnalyse = async({ companyName, jobTitle, jobDescription, file }: {companyName: string, jobTitle: string, jobDescription: string, file: File}) => {
    setIsProcessing(true);
    setStatusText("Uploading the file...");

    const uploadFile = await fs.upload([file]);

    if(!uploadFile) return setStatusText('Error: Failed to upload file');

    setStatusText("Converting the image...");
    // const imageFile = await convertPdfToImage(file);
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (!form) return;

    const formData = new FormData(form);

    const companyName = formData.get('company-name');
    const jobTitle = formData.get('job-title');
    const jobDescription = formData.get('job-description');

    if (!file) return;

    handleAnalyse({
      companyName: companyName as string,
      jobTitle: jobTitle as string,
      jobDescription: jobDescription as string,
      file
    })

  }

  return (
    <main className="bg-[url('/images/bg-main.svg')]">
    <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
             <h2>{statusText}</h2>
             <img src="/images/resume-scan-gif" alt="Resume scanning animation" className="w-full" />

            </>
          ) : (
            <h2>Upload your resume and get instant feedback on how to improve it for your dream job!</h2>
          )}
          {!isProcessing && (
            <form id='upload-form' onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input type="text" name='company-name' placeholder='Company Name' id='comany-name' />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input type="text" name='job-title' placeholder='Job Title' id='job-title' />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea rows={5} name='job-description' placeholder='Job Description' id='job-description' />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect}/>
              </div>

              <button type='submit' className="primary-button">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default Uploads