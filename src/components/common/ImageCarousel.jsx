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

      {/* Navigation Arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-10 md:left-20 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white/90 text-primary shadow-md hover:bg-white hover:scale-110 transition-all z-20 focus:outline-none"
        aria-label="Previous slide"
      >
        <span className="material-symbols-outlined font-bold">arrow_back_ios_new</span>
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-10 md:right-20 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white/90 text-primary shadow-md hover:bg-white hover:scale-110 transition-all z-20 focus:outline-none"
        aria-label="Next slide"
      >
        <span className="material-symbols-outlined font-bold">arrow_forward_ios</span>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              currentIndex === index 
                ? "bg-white scale-125 shadow-sm" 
                : "bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
