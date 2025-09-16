import { RepoInfo } from './AppDefinition'

export interface IImageSource {
    uploadedTarPathSource?: { uploadedTarPath: string; gitHash: string }
    alacranDefinitionContentSource?: {
        alacranDefinitionContent: string
        gitHash: string
    }
    repoInfoSource?: RepoInfo
}
