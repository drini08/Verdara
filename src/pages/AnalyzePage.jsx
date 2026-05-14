import { useEffect, useState } from "react";
import { analyzeDiseasePhoto } from "../services/analysisService";
import {
  analyzePreviewPlaceholder,
  pageHeroImages
} from "../data/images";

function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!file) {
      setError("Please upload a crop image first.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    const analysis = await analyzeDiseasePhoto(file);
    if (!analysis.accepted) {
      setError(analysis.notes);
      setResult(null);
      setIsLoading(false);
      return;
    }

    setResult(analysis);
    setIsLoading(false);
  }

  const previewSrc = previewUrl || analyzePreviewPlaceholder.src;
  const previewAlt = previewUrl
    ? "Uploaded crop preview"
    : analyzePreviewPlaceholder.alt;

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Computer vision lab</p>
            <h1 className="headline-animate">
              Upload a crop photo and analyze disease defects
            </h1>
          </div>
          <div className="page-hero-visual media-frame">
            <img
              src={pageHeroImages.analyze.src}
              alt={pageHeroImages.analyze.alt}
              loading="lazy"
              width={1000}
              height={750}
            />
          </div>
        </div>
      </section>

      <section className="analyze-section">
        <div className="container analyze-layout">
          <form className="table-card analyze-form" onSubmit={handleAnalyze}>
            <h3>Image upload</h3>
            <label htmlFor="crop-image" className="upload-input">
              Choose crop image
            </label>
            <input
              id="crop-image"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file ? <p className="hint">Selected: {file.name}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-primary" disabled={isLoading} type="submit">
              {isLoading ? "Analyzing..." : "Analyze photo"}
            </button>
          </form>

          <article className="table-card analyze-preview">
            <h3>Preview and result</h3>
            <div className="analyze-preview-visual media-frame">
              <img
                src={previewSrc}
                alt={previewAlt}
                className={previewUrl ? "preview-image" : "preview-image preview-image--placeholder"}
                width={960}
                height={600}
              />
            </div>
            {!previewUrl ? (
              <p className="hint analyze-preview-hint">
                Upload a plant image to replace the sample preview and run analysis.
              </p>
            ) : null}

            {result ? (
              <div className="analysis-result">
                <p>
                  <strong>Disease:</strong> {result.disease}
                </p>
                {result.scientificName && (
                  <p>
                    <strong>Scientific Name:</strong> <em>{result.scientificName}</em>
                  </p>
                )}
                <p>
                  <strong>Confidence Score:</strong> {result.confidence}%
                </p>
                <p>
                  <strong>Severity Level:</strong> <span className={`risk risk-${result.severity}`}>{result.severity}</span>
                </p>
                {result.symptoms && (
                  <>
                    <p>
                      <strong>Symptoms:</strong>
                    </p>
                    <p>{result.symptoms}</p>
                  </>
                )}
                {result.management && result.management.length > 0 && (
                  <>
                    <p>
                      <strong>Management Recommendations:</strong>
                    </p>
                    <ul className="analysis-list">
                      {result.management.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {result.affectedCrops && result.affectedCrops.length > 0 && (
                  <p>
                    <strong>Typically Affects:</strong> {result.affectedCrops.join(', ')}
                  </p>
                )}
                <p className="hint">{result.notes}</p>
              </div>
            ) : null}
          </article>
        </div>
      </section>
    </>
  );
}

export default AnalyzePage;
