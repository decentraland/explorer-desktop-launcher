import './App.css'
import { useEffect, useState } from 'react'

type Props = {
  onSelectBranches: (kernelBranch: string, rendererBranch: string) => void
}

const VersionSelector: React.FC<Props> = ({ onSelectBranches }) => {
  const [kernelBranches, setKernelBranches] = useState<string[]>([])
  const [rendererBranches, setRendererBranchesBranches] = useState<string[]>([])

  const [kernelBranch, setKernelBranch] = useState<string>('main')
  const [rendererBranch, setRendererBranch] = useState<string>('main')

  const getBranchesFromGitHub = async (repositoryName: string): Promise<string[]> => {
    const response = await fetch(`https://api.github.com/repos/decentraland/${repositoryName}/branches`)

    const data = await response.json()
    const branches: string[] = data.map((x: { name: string }) => x.name)
    return Promise.resolve(branches)
  }

  const getBranchesFromURL = async (url: string): Promise<string[]> => {
    const response = await fetch(url)

    const data = await response.json()
    return Promise.resolve(data)
  }

  useEffect(() => {
    ;(async () => {
      const kernelBranches = await getBranchesFromGitHub('kernel')
      const rendererBranches = await getBranchesFromURL(
        'https://renderer-artifacts.decentraland.org/desktop/branches.json'
      )
      setKernelBranches(kernelBranches)
      setRendererBranchesBranches(rendererBranches)
    })()
  }, [])

  const onSelect = () => {
    onSelectBranches(kernelBranch, rendererBranch)
  }

  return (
    <div>
      <div>
        Kernel branch:
        <select id="kernelBranch" onChange={(e) => setKernelBranch(e.target.value)} value={kernelBranch}>
          {kernelBranches.map((branch: string) => (
            <option value={branch} key={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>
      <div>
        Desktop renderer branch:
        <select id="rendererBranch" onChange={(e) => setRendererBranch(e.target.value)} value={rendererBranch}>
          {rendererBranches.map((branch: string) => (
            <option value={branch} key={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>
      <button onClick={onSelect}>Select</button>
    </div>
  )
}

export default VersionSelector
