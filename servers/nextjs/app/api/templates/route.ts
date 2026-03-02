import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { TemplateSetting } from '@/app/(presentation-generator)/template-preview/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ExtendedTemplateSetting extends TemplateSetting {
    layoutOrder?: string[]
}

const normalizeLayoutName = (value: string): string =>
    value.replace(/\.tsx$/i, '').trim().toLowerCase()

const naturalSort = (a: string, b: string): number =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

const sortLayoutFiles = (
    files: string[],
    settings: ExtendedTemplateSetting | null
): string[] => {
    const fallbackSorted = [...files].sort(naturalSort)

    const rawOrder = settings?.layoutOrder
    if (!settings?.ordered || !Array.isArray(rawOrder) || rawOrder.length === 0) {
        return fallbackSorted
    }

    const orderMap = new Map(
        rawOrder.map((name, index) => [normalizeLayoutName(name), index])
    )

    return [...files].sort((a, b) => {
        const aRank = orderMap.get(normalizeLayoutName(a))
        const bRank = orderMap.get(normalizeLayoutName(b))

        if (aRank !== undefined && bRank !== undefined) return aRank - bRank
        if (aRank !== undefined) return -1
        if (bRank !== undefined) return 1
        return naturalSort(a, b)
    })
}

export async function GET() {
    try {
        // Get the path to the presentation-templates directory
        const templatesDirectory = path.join(process.cwd(), 'presentation-templates')
        
        // Read all directories in the presentation-templates directory
        const items = await fs.readdir(templatesDirectory, { withFileTypes: true })
        
        // Filter for directories (layout templates) and exclude files
        const templateDirectories = items
            .filter(item => item.isDirectory())
            .map(dir => dir.name)
        
        const allLayouts: {templateName: string, templateID: string; files: string[]; settings: TemplateSetting | null }[] = []
        
        // Scan each template directory for layout files and settings
        for (const templateName of templateDirectories) {
            try {
                const templatePath = path.join(templatesDirectory, templateName)
                const templateFiles = await fs.readdir(templatePath)
                
                // Filter for .tsx files and exclude any non-layout files
                const layoutFiles = templateFiles.filter(file => 
                    file.endsWith('.tsx') && 
                    !file.startsWith('.') && 
                    !file.includes('.test.') &&
                    !file.includes('.spec.') &&
                    file !== 'settings.json'
                )
                
                // Read settings.json if it exists
                let settings: ExtendedTemplateSetting | null = null
                const settingsPath = path.join(templatePath, 'settings.json')
                try {
                    const settingsContent = await fs.readFile(settingsPath, 'utf-8')
                    // Support UTF-8 BOM in settings.json files.
                    const normalizedSettingsContent = settingsContent.replace(/^\uFEFF/, '')
                    settings = JSON.parse(normalizedSettingsContent) as ExtendedTemplateSetting
                } catch (settingsError) {
                    
                    console.warn(`No settings.json found for template ${templateName} or invalid JSON`)
                    // Provide default settings if settings.json is missing or invalid
                    settings = {
                        description: `${templateName} presentation layouts`,
                        ordered: false,
                        default: false
                    }
                   
                }

                const orderedLayoutFiles = sortLayoutFiles(layoutFiles, settings)

                if (layoutFiles.length > 0) {
                    allLayouts.push({
                        templateName: templateName,
                        templateID: templateName,
                        files: orderedLayoutFiles,
                        settings: settings
                    })
                }
            } catch (error) {
                console.error(`Error reading template directory ${templateName}:`, error)
                // Continue with other templates even if one fails
            }
        }
      
        
        return NextResponse.json(allLayouts)
    } catch (error) {
        console.error('Error reading presentation-templates directory:', error)
        return NextResponse.json(
            { error: 'Failed to read presentation-templates directory' },
            { status: 500 }
        )
    }
} 
