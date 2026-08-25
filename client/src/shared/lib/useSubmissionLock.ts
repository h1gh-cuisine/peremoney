import { useRef, useState } from 'react';
import { SubmissionLock } from './submission-lock';
export function useSubmissionLock() {
  const lock = useRef(new SubmissionLock()); const [submitting,setSubmitting]=useState(false);
  async function run<T>(operation:()=>Promise<T>) { if(lock.current.isPending)return undefined; setSubmitting(true);
    try{return await lock.current.run(operation);}finally{setSubmitting(false);} }
  return { submitting, run };
}
