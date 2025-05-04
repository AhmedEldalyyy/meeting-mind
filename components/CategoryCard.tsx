"use client"

import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User, FileText, BarChart, Info, CircleAlert, Hash, CheckCircle2 } from "lucide-react"

interface CategoryItem {
  [key: string]: string
}

interface CategoryProps {
  title: string
  items: CategoryItem[]
  gridSpan?: string
  icon?: React.ComponentType<any> // Icon component
}

const CategoryCard: React.FC<CategoryProps> = ({ title, items, gridSpan, icon: Icon }) => {
  // Generate gradient colors based on title
  const getGradient = (title: string) => {
    const gradients = {
      'Tasks': 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400',
      'Decisions': 'from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400',
      'Questions': 'from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400',
      'Insights': 'from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400',
      'Deadlines': 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400',
      'Attendees': 'from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400',
      'Follow-ups': 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400',
      'Risks': 'from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400'
    };
    
    return gradients[title] || 'from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400';
  };
  
  const gradientClass = getGradient(title);
  
  return (
    <Card className={`h-full ${gridSpan} shadow-contrast-dark border-border/50 group hover:shadow-lg transition-all duration-300 overflow-hidden relative`}>
      <div className={`absolute inset-0 bg-gradient-to-r opacity-5 group-hover:opacity-10 transition-opacity duration-500 ${gradientClass}`}></div>
      <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
      
      <CardHeader className="border-b border-border/50 relative z-10 pb-3">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br shadow-md flex items-center justify-center ${gradientClass} transition-all duration-300 group-hover:scale-110`}>
                <Icon className="w-5 h-5 text-white transition-transform group-hover:rotate-[-5deg]" />
              </div>
            )}
            <CardTitle className={`text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent ${gradientClass}`}>
              {title}
            </CardTitle>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-border/50 flex items-center justify-center opacity-60 group-hover:opacity-100 group-hover:border-primary/50 transition-all duration-300">
            <span className="text-xs font-bold">+</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <ScrollArea className="h-[250px] pr-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground p-2">No items available.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={index} className="bg-card/50 dark:bg-black/20 p-4 rounded-lg border border-border/30 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center gap-1.5 opacity-70 mb-2 pb-1 border-b border-border/20">
                    <Hash className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Item {index + 1}</span>
                    <div className={`ml-auto h-4 w-4 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  {Object.entries(item).map(([key, value]) => {
                    const formattedKey = key
                      .split(/(?=[A-Z])/) // Split on capital letters (camelCase)
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    
                    let formattedValue = value;
                    
                    // Format dates
                    if ((key === 'dueDate' || key === 'date') && value && value.includes('T')) {
                      formattedValue = value.split('T')[0];
                    }
                    
                    return (
                      <div key={key} className="mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-0 border-border/10">
                        <span className={`block mb-1 text-sm font-semibold bg-gradient-to-r bg-clip-text text-transparent ${gradientClass}`}>{formattedKey}:</span> 
                        <span className="text-foreground/90 text-base">{formattedValue}</span>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-70 transition-opacity duration-300">
          Click to expand
        </div>
      </CardContent>
    </Card>
  )
}

export default CategoryCard
