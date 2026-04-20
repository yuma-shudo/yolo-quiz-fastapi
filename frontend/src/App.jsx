import './App.css'
import { useState, useRef } from 'react'
import { Camera, CheckCircle, XCircle } from 'lucide-react'
import ArchivePanel from './ArchivePanel'
const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function App() {
  const [image, setImage] = useState(null)          // アップロードした画像
  const [imageUrl, setImageUrl] = useState(null)    // 保存済の画像のURL
  const [confidence, setConfidence] = useState(0.25) // 信頼度
  const [quizData, setQuizData] = useState(null)     // APIのレスポンス
  const [selectedAnswer, setSelectedAnswer] = useState(null) // 選んだ回答
  const [isLoading, setIsLoading] = useState(false)  // 推論中かどうか
  const [errorMessage, setErrorMessage] = useState(null)  // 推論失敗（検出数ゼロ）
  const inputRef = useRef(null)
  const handleDetect = async () => {
    setQuizData(null)
    setSelectedAnswer(null)
    setIsLoading(true) 
    setErrorMessage(null)
    if (!imageUrl) {
      const saveFormData = new FormData()
      saveFormData.append("file", image)
      fetch(`${API_BASE}/images`, {
        method: "POST",
        body: saveFormData
      })
    }
    let fileToSend = image
    if (imageUrl) {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      fileToSend = new File([blob], "image.png", { type: "image/png" })
    }
    const formData = new FormData()
    formData.append("file", fileToSend)
    formData.append("confidence", confidence)
    const response = await fetch(`${API_BASE}/detect`, {
      method: "POST",
      body: formData
    })
    const data = await response.json()
    if (!response.ok) {
      setErrorMessage("検出されませんでした！信頼度を下げてみてください！")
    } else {
      setQuizData(data)
    }         
    setIsLoading(false)       
  }

  return (
    <>
      <div className="container">
        <div className="left">
          <div className="card">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0])
                setImageUrl(null)
              }}
              ref={inputRef}
              style={{ display: 'none' }}
            />
            <button className="inputImageFile" onClick={() => inputRef.current.click()}>
              <Camera />
            </button>
            <div className="sliderWrapper">
              <span>Confidence</span>
              <input 
                type="range" 
                min="0" max="1" step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
              />
            </div>
            <button className="detect" onClick={handleDetect}>この画像でクイズを作成！</button>
          </div>
          <img src={imageUrl ?? (image ? URL.createObjectURL(image) : null)} />
        </div>
        <div className="right">
          {errorMessage &&
            <p>{errorMessage}</p>
          }
          {quizData && 
            <>
              <img className="cropImage" src={`data:image/png;base64,${quizData.crop_image}`} />
              <div className="card">
              <p className="question">Q. AIはこの切り抜かれた部分を何と判定したでしょう？</p>
                {quizData.choices.map((choice) => (
                  <button className="choiceButton" key={choice} onClick={() => setSelectedAnswer(choice)}>
                    {choice}
                  </button>
                ))}
              </div>
              {selectedAnswer && 
                <>
                  <div className={selectedAnswer === quizData.correct_answer ? "resultCard correct" : "resultCard incorrect"}>
                    {selectedAnswer === quizData.correct_answer 
                      ? <><CheckCircle /> <p>正解！</p></>
                      : <><XCircle /> <p>残念...</p></>
                    }                 
                  </div>
                  <img className="resultImage" src={`data:image/png;base64,${quizData.result_image}`} />
                </>
              }
            </>
          }
        </div>
      </div>
      <ArchivePanel setImage={setImage} setImageUrl={setImageUrl} setQuizData={setQuizData} />
    </>
  )
}