export class JsUtils {

    static concatPaths(p1: string, p2: string): string {
        if (!p1)
            {return p2;}
        if (!p2)
            {return p1;}
        const end: boolean = p1.endsWith("/");
        const start: boolean = p2.startsWith("/");
        if (end && start)
            {p2 = p2.substring(1);}
        else if (!end && !start)
            {p2 = "/" + p2;}
        return p1 + p2;
    }

    static appendQueryParam(url: string, keyValue: string): string {
        const sep: string = url.indexOf("?") >= 0 ? "&" : "?";
        return url + sep + keyValue;
    }

}
