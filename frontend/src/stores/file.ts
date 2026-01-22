import { defineStore } from 'pinia'
import { ref } from 'vue'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'

export const useFileStore = defineStore('file', () => {
  const currentFileName = ref<string>('untitled.dbml')
  const isModified = ref(false)

  const loadFile = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.dbml,.sql,.txt'

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error('No se seleccionó ningún archivo'))
          return
        }

        currentFileName.value = file.name
        isModified.value = false

        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          resolve(content)
        }
        reader.onerror = () => reject(new Error('Error al leer el archivo'))
        reader.readAsText(file)
      }

      input.onclick = () => {
        input.value = ''
      }

      input.click()
    })
  }

  const saveFile = (content: string, fileName?: string) => {
    const name = fileName || currentFileName.value
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, name)
    isModified.value = false
  }

  const exportSQL = (content: string, dbType: string = 'postgresql') => {
    const fileName = currentFileName.value.replace('.dbml', `.${dbType}.sql`)
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' })
    saveAs(blob, fileName)
  }

  const exportImage = async (elementId: string, fileName?: string) => {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Elemento no encontrado')
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const name =
            (fileName || currentFileName.value.replace('.dbml', '')).replace(
              /\.(png|jpg|jpeg)$/i,
              '',
            ) + '.png'
          saveAs(blob, name)
        }
      })
    } catch (error) {
      console.error('Error exportando imagen:', error)
      throw error
    }
  }

  const setModified = (modified: boolean) => {
    isModified.value = modified
  }

  const setFileName = (fileName: string) => {
    currentFileName.value = fileName
  }

  return {
    currentFileName,
    isModified,
    loadFile,
    saveFile,
    exportSQL,
    exportImage,
    setModified,
    setFileName,
  }
})
