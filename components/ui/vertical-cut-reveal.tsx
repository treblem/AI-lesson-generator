'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { motion } from "framer-motion"
// FIX: 'DynamicAnimationOptions' is deprecated. Using 'AnimationOptions' instead.
import type { AnimationOptions } from "framer-motion"
import { cn } from "../../lib/utils"

interface TextProps {
  children: React.ReactNode
  reverse?: boolean
  transition?: AnimationOptions
  splitBy?: "words" | "characters" | "lines" | string
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | "random" | number
  containerClassName?: string
  wordLevelClassName?: string
  elementLevelClassName?: string
  onClick?: () => void
  onStart?: () => void
  onComplete?: () => void
  autoStart?: boolean
}

export interface VerticalCutRevealRef {
  startAnimation: () => void
  reset: () => void
}

interface WordObject {
  characters: string[]
  needsSpace: boolean
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, TextProps>(
  (
    {
      children,
      reverse = false,
      transition = {
        type: "spring",
        stiffness: 190,
        damping: 22,
      },
      splitBy = "words",
      staggerDuration = 0.2,
      staggerFrom = "first",
      containerClassName,
      wordLevelClassName,
      elementLevelClassName,
      onClick,
      onStart,
      onComplete,
      autoStart = true,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLSpanElement>(null)
    const text = typeof children === "string" ? children : children?.toString() || ""
    const [isAnimating, setIsAnimating] = useState(false)

    const splitIntoCharacters = (text: string): string[] => {
      if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        // Fix: Property 'Segmenter' does not exist on type 'typeof Intl'. Cast Intl to any to allow access.
        const segmenter = new (Intl as any).Segmenter("en", { granularity: "grapheme" })
        return Array.from(segmenter.segment(text), ({ segment }: { segment: string }) => segment)
      }
      return Array.from(text)
    }

    const elements = useMemo(() => {
      const words = text.split(" ")
      if (splitBy === "characters") {
        return words.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== words.length - 1,
        }))
      }
      return splitBy === "words"
        ? text.split(" ")
        : splitBy === "lines"
          ? text.split("\n")
          : text.split(splitBy)
    }, [text, splitBy])

    const getStaggerDelay = useCallback(
      (index: number) => {
        const total =
          splitBy === "characters"
            ? elements.reduce(
                (acc, word) =>
                  acc +
                  (typeof word === "string"
                    ? 1
                    : (word as WordObject).characters.length + ((word as WordObject).needsSpace ? 1 : 0)),
                0
              )
            : elements.length
        if (staggerFrom === "first") return index * staggerDuration
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        if (typeof staggerFrom === 'number') {
            return Math.abs(staggerFrom - index) * staggerDuration
        }
        return 0
      },
      [elements, staggerFrom, staggerDuration, splitBy]
    )

    const startAnimation = useCallback(() => {
      setIsAnimating(true)
      onStart?.()
    }, [onStart])

    useImperativeHandle(ref, () => ({
      startAnimation,
      reset: () => setIsAnimating(false),
    }))

    useEffect(() => {
      if (autoStart) {
        startAnimation()
      }
    }, [autoStart, startAnimation])

    const variants = {
      hidden: { y: reverse ? "-100%" : "100%" },
      visible: (i: number) => ({
        y: 0,
        transition: {
          ...transition,
          delay: ((transition?.delay as number) || 0) + getStaggerDelay(i),
        },
      }),
    }
    
    const renderContent = () => {
        if (splitBy === 'characters') {
             const words = elements as WordObject[];
             return words.map((wordObj, wordIndex) => {
                 const prevChar = words.slice(0, wordIndex).reduce((acc, curr) => acc + curr.characters.length, 0);
                 return (
                    <span
                        key={wordIndex}
                        aria-hidden="true"
                        className={cn("inline-flex overflow-hidden", wordLevelClassName)}
                    >
                        {wordObj.characters.map((char, charIndex) => (
                           <motion.span
                            key={charIndex}
                            custom={prevChar + charIndex}
                            initial="hidden"
                            animate={isAnimating ? "visible" : "hidden"}
                            variants={variants}
                            className={cn("inline-block", elementLevelClassName)}
                            >
                                {char}
                           </motion.span>
                        ))}
                        {wordObj.needsSpace && <span>&nbsp;</span>}
                    </span>
                 )
             })
        }
        
        return (elements as string[]).map((el, i) => (
             <span
              key={i}
              aria-hidden="true"
              className={cn("inline-flex overflow-hidden", wordLevelClassName)}
            >
                <motion.span
                    custom={i}
                    initial="hidden"
                    animate={isAnimating ? "visible" : "hidden"}
                    variants={variants}
                    onAnimationComplete={
                      i === elements.length - 1 ? onComplete : undefined
                    }
                    className={cn("inline-block", elementLevelClassName)}
                  >
                    {el}{i !== elements.length -1 && <span>&nbsp;</span>}
                  </motion.span>
            </span>
        ));
    }

    return (
      <span
        className={cn(
          containerClassName,
          "flex flex-wrap whitespace-pre-wrap",
          splitBy === "lines" && "flex-col"
        )}
        onClick={onClick}
        ref={containerRef}
        {...props}
      >
        <span className="sr-only">{text}</span>
        {renderContent()}
      </span>
    )
  }
)

VerticalCutReveal.displayName = "VerticalCutReveal"

export { VerticalCutReveal }