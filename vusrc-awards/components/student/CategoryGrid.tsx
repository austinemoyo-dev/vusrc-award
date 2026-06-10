'use client'

import { motion } from 'framer-motion'
import { CategoryCard, type CategoryCardData } from './CategoryCard'

interface CategoryGridProps {
  categories: CategoryCardData[]
  votedCategoryIds: string[]
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const

const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
} as const

export function CategoryGrid({ categories, votedCategoryIds }: CategoryGridProps) {
  const votedSet = new Set(votedCategoryIds)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {categories.map((category) => (
        <motion.div key={category.id} variants={item}>
          <CategoryCard category={category} hasVoted={votedSet.has(category.id)} />
        </motion.div>
      ))}
    </motion.div>
  )
}
