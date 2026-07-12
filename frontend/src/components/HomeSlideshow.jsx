import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/images/Homepage/victoria-falls.jpg", caption: "Victoria Falls" },
  { src: "/images/Homepage/great-zimbabwe.jpg", caption: "Great Zimbabwe" },
  { src: "/images/Homepage/harare-cbd.jpg", caption: "Harare CBD" },
  { src: "/images/Homepage/lake-kariba.jpg", caption: "Chinhoyi Caves" },
  { src: "/images/Homepage/eastern-highlands.jpg", caption: "Eastern Highlands" },
];

const SLIDE_DURATION_MS = 20000;

export default function HomeSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden"
      data-testid="home-slideshow"
    >
      {SLIDES.map((slide, index) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: index === activeIndex ? 1 : 0 }}
        >
          <img
            src={slide.src}
            alt={slide.caption}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          <p className="absolute bottom-3 left-4 text-white text-sm font-medium tracking-wide">
            {slide.caption}
          </p>
        </div>
      ))}

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
            aria-label={`Show ${slide.caption}`}
            data-testid={`slideshow-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}