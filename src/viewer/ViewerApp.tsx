import { usePathname } from '../lib/route'
import { CODE_LENGTH } from '../state/viewer'
import { CodeEntry } from './CodeEntry'
import { ViewerScreen } from './ViewerScreen'

export function ViewerApp() {
  const code = usePathname().replace(/[^a-z0-9]/gi, '').toUpperCase()
  return code.length === CODE_LENGTH ? <ViewerScreen key={code} code={code} /> : <CodeEntry />
}
