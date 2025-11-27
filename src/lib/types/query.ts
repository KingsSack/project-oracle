export interface StepData {
	step: string;
	content?: string;
}

export interface SiteData {
	title: string;
	url: string;
	description?: string;
}

export interface TagData {
	name: string;
}

export interface FollowUpData {
	query: string;
}

export interface ResponsePart {
	type: 'text' | 'topic';
	content: string;
}

export interface Query {
	id: number;
	type: 'answer' | 'research';
	query: string;
	result: string | null;
}
