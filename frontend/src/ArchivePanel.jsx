import './ArchivePanel.css'
import { useState } from 'react'
import { Trash2, ArrowUpFromLine, ChevronRight, ChevronLeft } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function ArchivePanel({ setImage, setImageUrl, setQuizData }) {
	const [selectedImage, setSelectedImage] = useState(null)
	const [isOpen, setIsOpen] = useState(false)
	const [allImages, setAllImages] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const getImage = async () => { 
		setIsLoading(true)
		const response = await fetch(`${API_BASE}/images`, {
			method: "GET",
		})
		const data = await response.json()
		setAllImages(data)
		setIsLoading(false)
	}
	const handleToggle = () => {
		if (!isOpen) {
			getImage()
		}
		setIsOpen(!isOpen)
	}
	const handleDelete = async (id) => { 
		setIsLoading(true)
		const delete_image = await fetch(`${API_BASE}/images/${id}`, {
		method: "DELETE",
		})
		const response = await fetch(`${API_BASE}/images`, {
		method: "GET",
		})
		const data = await response.json()
		setAllImages(data)
		setIsLoading(false)   
	}
	const handleImport = () => {
		setQuizData(null)
		setImageUrl(`${API_BASE}/images/${selectedImage.id}/file`)
		setIsOpen(!isOpen)
	}
	
	
  return (
	<>
		{isOpen && <div className="overlay" />}
		<div className={isOpen ? "archivePanel open" : "archivePanel"}>
				<button className="tab" onClick={handleToggle}>
					{isOpen ? <ChevronRight /> : <ChevronLeft />}
				</button>
				{isOpen && 
					<div className="imageGrid">
						{isLoading 
							? <p>プレイした画像を読み込み中です...</p>
							: allImages.map((image) => (
								<div key={image.id}>
									<img onClick={() => setSelectedImage(image)} src={`${API_BASE}/images/${image.id}/file`} />
									{selectedImage?.id === image.id && 
										<div className="actionButtons">
											<button className="deleteButton" onClick={() => handleDelete(image.id)}><Trash2 /></button>
											<button className="importButton" onClick={handleImport}><ArrowUpFromLine /></button>							
										</div>
									}
								</div>
							))
  						}
					</div>
				}
		</div>
	</>	
  )
}