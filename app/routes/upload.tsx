import { prepareInstructions } from '../../constants/index';
import React, { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router';
import FileUploader from '~/Components/FileUploader';
import Navbar from '~/Components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';

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

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const uploadFile = await fs.upload([file]);

    if(!uploadFile) return setStatusText('Error: Failed to upload file');

    setStatusText("Converting the image...");
    console.log('Starting PDF conversion...');
    
    let imageFile;
    try {
      imageFile = await convertPdfToImage(file);
      console.log('Conversion result:', imageFile);
      
      if(!imageFile.file) {
        console.error('PDF conversion failed:', imageFile.error);
        return setStatusText(`Error: ${imageFile.error || 'Failed to convert PDF to image'}`);
      }
      
      console.log('PDF converted successfully');
    } catch (error) {
      console.error('PDF conversion error:', error);
      return setStatusText(`Error: PDF conversion failed - ${error}`);
    }

    setStatusText("Uploading the converted image...");
    const uploadedImage = await fs.upload([imageFile.file]);
    if(!uploadedImage) return setStatusText('Error: Failed to upload converted image');

    setStatusText("Preparing data...");
    
    const uuid = generateUUID();
    const data = {
      id: uuid,
      resumepath: uploadFile.path,
      imagepath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback : '',
    }
    await kv.set(`resume:${uuid}`, JSON.stringify(data));

    setStatusText("Analyzing the resume...");

    const feedback = await ai.feedback(
      uploadFile.path,
      prepareInstructions({jobTitle, jobDescription})
    )
    if(!feedback) return setStatusText('Error: Failed to get feedback from AI');

    const  feedbackText = typeof feedback.message.content === 'string'
      ? feedback.message.content
      : feedback.message.content[0].text;

    data.feedback = JSON.parse(feedbackText);
    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("Analysis complete! Redirecting to results page...");
    console.log(data);
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
             <img src="/images/resume-scan.gif" alt="Resume scanning animation" className="w-full" />

            </>
          ) : (
            <h2>Upload your resume and get instant feedback on how to improve it for your dream job!</h2>
          )}
          {!isProcessing && (
            <form id='upload-form' onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input type="text" name='company-name' placeholder='Company Name' id='company-name' />
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
                <label>Upload Resume</label>
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