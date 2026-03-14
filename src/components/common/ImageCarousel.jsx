import { useState, useEffect } from 'react';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll functionality
  useEffect(() => {
    if (!images || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return null;
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 mb-24 group">
      
      {/* Decorative Side Borders (mimicking the circuit board pattern from mockup) */}
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-primary/10 dark:bg-primary/5 z-10 border-r border-primary/20 flex flex-col items-center justify-around py-4">
         <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
         <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
         <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-primary/10 dark:bg-primary/5 z-10 border-l border-primary/20 flex flex-col items-center justify-around py-4">
         <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
         <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
         <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
      </div>

      {/* Main Image Container */}
      <div 
        className="flex transition-transform duration-700 ease-in-out h-[300px] md:h-[450px] lg:h-[550px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, index) => (
          <div key={index} className="w-full h-full flex-shrink-0 relative px-8 md:px-16">
             <img 
               src={img.url} 
               alt={img.caption || `Slide ${index + 1}`} 
               className="w-full h-full object-cover object-center"
             />
             {/* Optional Caption Overlay */}
             {img.caption && (
               <div className="absolute bottom-0 left-8 md:left-16 right-8 md:right-16 bg-gradient-to-t from-slate-900/80 to-transparent p-6 pt-12 text-white">
                 <p className="text-lg md:text-xl font-medium">{img.caption}</p>
               </div>
             )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Outside Image) */}
      <button 
        onClick={prevSlide}
        className="absolute left-1 lg:left-4 top-1/2 -translate-y-1/2 w-8 md:w-10 h-8 md:h-10 rounded-full flex items-center justify-center bg-white shadow-md hover:bg-slate-50 transition-colors z-30 focus:outline-none border border-slate-200"
        aria-label="Previous slide"
      >
        <span className="material-symbols-outlined text-primary text-xl md:text-2xl font-light">chevron_left</span>
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-1 lg:right-4 top-1/2 -translate-y-1/2 w-8 md:w-10 h-8 md:h-10 rounded-full flex items-center justify-center bg-white shadow-md hover:bg-slate-50 transition-colors z-30 focus:outline-none border border-slate-200"
        aria-label="Next slide"
      >
        <span className="material-symbols-outlined text-primary text-xl md:text-2xl font-light">chevron_right</span>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`rounded-full transition-all duration-300 ${
              currentIndex === index 
                ? "w-2.5 h-2.5 bg-white shadow-sm" 
                : "w-2 h-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
