import React, { useState, type FormEvent } from 'react'
import Navbar from '~/Components/Navbar'

const Uploads = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {}

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
                <div>Uploader</div>
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