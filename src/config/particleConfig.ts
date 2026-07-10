import type { ISourceOptions } from "@tsparticles/engine";

export function getParticleConfig(isLightMode: boolean, prefersReducedMotion: boolean): ISourceOptions {
  const minOpacity = isLightMode ? 0.07 : 0.12;
  const maxOpacity = isLightMode ? 0.13 : 0.22;
  
  return {
    autoPlay: true,
    background: {
      color: {
        value: "transparent"
      }
    },
    fullScreen: {
      enable: true,
      zIndex: 0
    },
    detectRetina: true,
    fpsLimit: 60,
    pauseOnBlur: true,
    pauseOnOutsideViewport: true,
    particles: {
      number: {
        value: 600,
        density: {
          enable: false
        }
      },
      color: {
        value: "#ffffff"
      },
      shape: {
        type: "rounded-rect",
        options: {
          "rounded-rect": {
            width: 3,
            height: 8,
            radius: 2.5
          }
        }
      },
      opacity: {
        value: { min: minOpacity, max: maxOpacity },
        animation: {
          enable: false
        }
      },
      size: {
        value: { min: 1.5, max: 2.5 }
      },
      rotate: {
        value: { min: 0, max: 360 },
        direction: "random",
        animation: {
          enable: !prefersReducedMotion,
          speed: { min: 0.5, max: 2 },
          sync: false
        }
      },
      move: {
        enable: true,
        speed: prefersReducedMotion ? 0.05 : { min: 0.08, max: 0.25 },
        direction: "none",
        random: true,
        straight: false,
        outModes: {
          default: "out"
        }
      }
    },
    interactivity: {
      detectsOn: "window",
      events: {
        onHover: {
          enable: !prefersReducedMotion,
          mode: ["repel", "bubble"]
        }
      },
      modes: {
        repel: {
          distance: 180,
          speed: 0.35,
          factor: 0.8,
          speedFactor: 0.8
        },
        bubble: {
          distance: 180,
          size: 4.5,
          opacity: isLightMode ? 0.24 : 0.4,
          duration: 2
        }
      }
    },
    responsive: [
      {
        maxWidth: 640,
        options: {
          particles: {
            number: {
              value: 160
            }
          }
        }
      },
      {
        maxWidth: 1024,
        options: {
          particles: {
            number: {
              value: 300
            }
          }
        }
      },
      {
        maxWidth: 1440,
        options: {
          particles: {
            number: {
              value: 440
            }
          }
        }
      }
    ]
  };
}
