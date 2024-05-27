import { DocSectionCode } from '@/components/doc/common/docsectioncode';
import { DocSectionText } from '@/components/doc/common/docsectiontext';
import { Checkbox } from '@/components/lib/checkbox/Checkbox';
import { useState } from 'react';

export function IndeterminateDoc(props) {
    const [checked, setChecked] = useState(false);

    const code = {
        basic: `
<Checkbox indeterminate onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
        `,
        javascript: `
import React, { useState } from "react";
import { Checkbox } from "primereact/checkbox";

export default function BasicDemo() {
    const [checked, setChecked] = useState(false);

    return (
        <div className="card flex justify-content-center">
            <Checkbox indeterminate onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
        </div>
    )
}
        `,
        typescript: `
import React, { useState } from "react";
import { Checkbox } from "primereact/checkbox";

export default function BasicDemo() {
    const [checked, setChecked] = useState<boolean>(false);

    return (
        <div className="card flex justify-content-center">
            <Checkbox indeterminate onChange={e => setChecked(e.checked)} checked={checked}></Checkbox>
        </div>
    )
}
        `
    };

    return (
        <>
            <DocSectionText {...props}>
                <p>
                    When <i>indeterminate</i> is present, the checkbox masks the actual value visually.
                </p>
            </DocSectionText>
            <div className="card flex justify-content-center">
                <Checkbox indeterminate onChange={(e) => setChecked(e.checked)} checked={checked} />
            </div>
            <DocSectionCode code={code} />
        </>
    );
}
